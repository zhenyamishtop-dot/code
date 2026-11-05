using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Хачатрян_задание4
{
    public class Pic
    {
        int x = 200, y = 200;   // Положение
        int dir = 1;            // Направление: 1 - влево, 2 - вправо, 3 - вверх, 4 - вниз.
        int size = 80;          // Размер
        int step = 3;           // Шаг за один тик таймера

        public int X { get => x; set => x = value; }
        public int Y { get => y; set => y = value; }
        public int Dir { get => dir; set => dir = value; }
        public int Size { get => size; set => size = value; }

        public Pic(int xx = 200, int yy = 200, int Sz = 80, int D = 1)
        {
            x = xx;
            y = yy;
            dir = D;
            size = Sz;
        }

        // Методы движения. За границу контейнера не выходим - иначе стоим.
        public void Left()
        {
            if (x - step >= 0)
                x -= step;
        }

        public void Right(PictureBox Pb)
        {
            // Ширина клиентской области контейнера, в котором лежит картинка.
            int W = Pb.Parent.ClientSize.Width;
            if (x + size + step <= W)
                x += step;
        }

        public void Up()
        {
            if (y - step >= 0)
                y -= step;
        }

        public void Down(PictureBox Pb)
        {
            // Высота клиентской области контейнера.
            int H = Pb.Parent.ClientSize.Height;
            if (y + size + step <= H)
                y += step;
        }

        // Метод отражения: выбрать направление,
        //                  изменить координату,
        //                  изменить размер,
        //                  отрисовать.
        public void Draw(PictureBox Pb)
        {
            switch (dir)
            {
                case 1: { Left(); break; }
                case 2: { Right(Pb); break; }
                case 3: { Up(); break; }
                case 4: { Down(Pb); break; }
            }
            Pb.Left = x;
            Pb.Top = y;
            Pb.Width = size;
            Pb.Height = size;
        }
    }
}
