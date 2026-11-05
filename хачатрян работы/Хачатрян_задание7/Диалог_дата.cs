using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Хачатрян_задание7
{
    public partial class Диалог_дата : Form
    {
        DateTime thisDay;   // сегодня
        DateTime allDay;    // дата, выбранная в календаре

        public String DateText = "";   // что вернется в редактор

        public Диалог_дата()
        {
            InitializeComponent();
        }

        private void Диалог_дата_Load(object sender, EventArgs e)
        {
            thisDay = DateTime.Today;
            textBox1.Text = thisDay.ToLongDateString();
            allDay = monthCalendar1.SelectionStart;
            listBox1.SelectedIndex = 1;   // по умолчанию длинный формат
        }

        // Показать выбранную дату в нужном формате.
        private void ShowDate()
        {
            if (listBox1.SelectedIndex == 0)
                textBox2.Text = allDay.ToShortDateString();
            else
                textBox2.Text = allDay.ToLongDateString();
        }

        private void monthCalendar1_DateChanged(object sender, DateRangeEventArgs e)
        {
            allDay = monthCalendar1.SelectionStart;
            ShowDate();
        }

        private void listBox1_SelectedIndexChanged(object sender, EventArgs e)
        {
            ShowDate();
        }

        // ОК
        private void button1_Click(object sender, EventArgs e)
        {
            DateText = textBox2.Text;
            DialogResult = DialogResult.OK;
        }

        // Отмена
        private void button2_Click(object sender, EventArgs e)
        {
            DialogResult = DialogResult.Cancel;
        }
    }
}
