namespace Хачатрян_задание4
{
    partial class Form1
    {
        /// <summary>
        /// Обязательная переменная конструктора.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Освободить все используемые ресурсы.
        /// </summary>
        /// <param name="disposing">истинно, если управляемый ресурс должен быть удален; иначе ложно.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Код, автоматически созданный конструктором форм Windows

        /// <summary>
        /// Требуемый метод для поддержки конструктора — не изменяйте
        /// содержимое этого метода с помощью редактора кода.
        /// </summary>
        private void InitializeComponent()
        {
            this.components = new System.ComponentModel.Container();
            this.menuStrip1 = new System.Windows.Forms.MenuStrip();
            this.направлениеToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.налевоToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.вверхToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.направоToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.внизToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.видToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.роботToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.нлоToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.ракетаToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.размерToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.маленькийToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.большойToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.скоростьToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.медленноToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.быстроToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.выходToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.timer1 = new System.Windows.Forms.Timer(this.components);
            this.imageList1 = new System.Windows.Forms.ImageList(this.components);
            this.contextMenuStrip1 = new System.Windows.Forms.ContextMenuStrip(this.components);
            this.роботToolStripMenuItem1 = new System.Windows.Forms.ToolStripMenuItem();
            this.нлоToolStripMenuItem1 = new System.Windows.Forms.ToolStripMenuItem();
            this.ракетаToolStripMenuItem1 = new System.Windows.Forms.ToolStripMenuItem();
            this.toolStrip1 = new System.Windows.Forms.ToolStrip();
            this.налевоToolStripButton = new System.Windows.Forms.ToolStripButton();
            this.вверхToolStripButton = new System.Windows.Forms.ToolStripButton();
            this.направоToolStripButton = new System.Windows.Forms.ToolStripButton();
            this.внизToolStripButton = new System.Windows.Forms.ToolStripButton();
            this.toolStripSeparator1 = new System.Windows.Forms.ToolStripSeparator();
            this.toolStripLabel1 = new System.Windows.Forms.ToolStripLabel();
            this.toolStripComboBox1 = new System.Windows.Forms.ToolStripComboBox();
            this.panel1 = new System.Windows.Forms.Panel();
            this.pictureBox1 = new System.Windows.Forms.PictureBox();
            this.menuStrip1.SuspendLayout();
            this.contextMenuStrip1.SuspendLayout();
            this.toolStrip1.SuspendLayout();
            this.panel1.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.pictureBox1)).BeginInit();
            this.SuspendLayout();
            //
            // menuStrip1
            //
            this.menuStrip1.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.направлениеToolStripMenuItem,
            this.видToolStripMenuItem,
            this.размерToolStripMenuItem,
            this.скоростьToolStripMenuItem,
            this.выходToolStripMenuItem});
            this.menuStrip1.Location = new System.Drawing.Point(0, 0);
            this.menuStrip1.Name = "menuStrip1";
            this.menuStrip1.Size = new System.Drawing.Size(684, 24);
            this.menuStrip1.TabIndex = 0;
            this.menuStrip1.Text = "menuStrip1";
            //
            // направлениеToolStripMenuItem
            //
            this.направлениеToolStripMenuItem.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.налевоToolStripMenuItem,
            this.вверхToolStripMenuItem,
            this.направоToolStripMenuItem,
            this.внизToolStripMenuItem});
            this.направлениеToolStripMenuItem.Name = "направлениеToolStripMenuItem";
            this.направлениеToolStripMenuItem.Size = new System.Drawing.Size(89, 20);
            this.направлениеToolStripMenuItem.Text = "&Направление";
            //
            // налевоToolStripMenuItem
            //
            this.налевоToolStripMenuItem.Image = global::Хачатрян_задание4.Properties.Resources.arrow_left;
            this.налевоToolStripMenuItem.Name = "налевоToolStripMenuItem";
            this.налевоToolStripMenuItem.ShortcutKeys = ((System.Windows.Forms.Keys)((System.Windows.Forms.Keys.Control | System.Windows.Forms.Keys.Left)));
            this.налевоToolStripMenuItem.Size = new System.Drawing.Size(180, 22);
            this.налевоToolStripMenuItem.Text = "Налево";
            this.налевоToolStripMenuItem.Click += new System.EventHandler(this.налевоToolStripMenuItem_Click);
            //
            // вверхToolStripMenuItem
            //
            this.вверхToolStripMenuItem.Image = global::Хачатрян_задание4.Properties.Resources.arrow_up;
            this.вверхToolStripMenuItem.Name = "вверхToolStripMenuItem";
            this.вверхToolStripMenuItem.ShortcutKeys = ((System.Windows.Forms.Keys)((System.Windows.Forms.Keys.Control | System.Windows.Forms.Keys.Up)));
            this.вверхToolStripMenuItem.Size = new System.Drawing.Size(180, 22);
            this.вверхToolStripMenuItem.Text = "Вверх";
            this.вверхToolStripMenuItem.Click += new System.EventHandler(this.вверхToolStripMenuItem_Click);
            //
            // направоToolStripMenuItem
            //
            this.направоToolStripMenuItem.Image = global::Хачатрян_задание4.Properties.Resources.arrow_right;
            this.направоToolStripMenuItem.Name = "направоToolStripMenuItem";
            this.направоToolStripMenuItem.ShortcutKeys = ((System.Windows.Forms.Keys)((System.Windows.Forms.Keys.Control | System.Windows.Forms.Keys.Right)));
            this.направоToolStripMenuItem.Size = new System.Drawing.Size(180, 22);
            this.направоToolStripMenuItem.Text = "Направо";
            this.направоToolStripMenuItem.Click += new System.EventHandler(this.направоToolStripMenuItem_Click);
            //
            // внизToolStripMenuItem
            //
            this.внизToolStripMenuItem.Image = global::Хачатрян_задание4.Properties.Resources.arrow_down;
            this.внизToolStripMenuItem.Name = "внизToolStripMenuItem";
            this.внизToolStripMenuItem.ShortcutKeys = ((System.Windows.Forms.Keys)((System.Windows.Forms.Keys.Control | System.Windows.Forms.Keys.Down)));
            this.внизToolStripMenuItem.Size = new System.Drawing.Size(180, 22);
            this.внизToolStripMenuItem.Text = "Вниз";
            this.внизToolStripMenuItem.Click += new System.EventHandler(this.внизToolStripMenuItem_Click);
            //
            // видToolStripMenuItem
            //
            this.видToolStripMenuItem.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.роботToolStripMenuItem,
            this.нлоToolStripMenuItem,
            this.ракетаToolStripMenuItem});
            this.видToolStripMenuItem.Name = "видToolStripMenuItem";
            this.видToolStripMenuItem.Size = new System.Drawing.Size(39, 20);
            this.видToolStripMenuItem.Text = "&Вид";
            //
            // роботToolStripMenuItem
            //
            this.роботToolStripMenuItem.Image = global::Хачатрян_задание4.Properties.Resources.robot;
            this.роботToolStripMenuItem.Name = "роботToolStripMenuItem";
            this.роботToolStripMenuItem.ShortcutKeys = ((System.Windows.Forms.Keys)((System.Windows.Forms.Keys.Control | System.Windows.Forms.Keys.D1)));
            this.роботToolStripMenuItem.Size = new System.Drawing.Size(160, 22);
            this.роботToolStripMenuItem.Text = "Робот";
            this.роботToolStripMenuItem.Click += new System.EventHandler(this.роботToolStripMenuItem_Click);
            //
            // нлоToolStripMenuItem
            //
            this.нлоToolStripMenuItem.Image = global::Хачатрян_задание4.Properties.Resources.ufo;
            this.нлоToolStripMenuItem.Name = "нлоToolStripMenuItem";
            this.нлоToolStripMenuItem.ShortcutKeys = ((System.Windows.Forms.Keys)((System.Windows.Forms.Keys.Control | System.Windows.Forms.Keys.D2)));
            this.нлоToolStripMenuItem.Size = new System.Drawing.Size(160, 22);
            this.нлоToolStripMenuItem.Text = "НЛО";
            this.нлоToolStripMenuItem.Click += new System.EventHandler(this.нлоToolStripMenuItem_Click);
            //
            // ракетаToolStripMenuItem
            //
            this.ракетаToolStripMenuItem.Image = global::Хачатрян_задание4.Properties.Resources.rocket;
            this.ракетаToolStripMenuItem.Name = "ракетаToolStripMenuItem";
            this.ракетаToolStripMenuItem.ShortcutKeys = ((System.Windows.Forms.Keys)((System.Windows.Forms.Keys.Control | System.Windows.Forms.Keys.D3)));
            this.ракетаToolStripMenuItem.Size = new System.Drawing.Size(160, 22);
            this.ракетаToolStripMenuItem.Text = "Ракета";
            this.ракетаToolStripMenuItem.Click += new System.EventHandler(this.ракетаToolStripMenuItem_Click);
            //
            // размерToolStripMenuItem
            //
            this.размерToolStripMenuItem.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.маленькийToolStripMenuItem,
            this.большойToolStripMenuItem});
            this.размерToolStripMenuItem.Name = "размерToolStripMenuItem";
            this.размерToolStripMenuItem.Size = new System.Drawing.Size(59, 20);
            this.размерToolStripMenuItem.Text = "&Размер";
            //
            // маленькийToolStripMenuItem
            //
            this.маленькийToolStripMenuItem.Image = global::Хачатрян_задание4.Properties.Resources.size_small;
            this.маленькийToolStripMenuItem.Name = "маленькийToolStripMenuItem";
            this.маленькийToolStripMenuItem.ShortcutKeys = System.Windows.Forms.Keys.F2;
            this.маленькийToolStripMenuItem.Size = new System.Drawing.Size(160, 22);
            this.маленькийToolStripMenuItem.Text = "Маленький";
            this.маленькийToolStripMenuItem.Click += new System.EventHandler(this.маленькийToolStripMenuItem_Click);
            //
            // большойToolStripMenuItem
            //
            this.большойToolStripMenuItem.Image = global::Хачатрян_задание4.Properties.Resources.size_big;
            this.большойToolStripMenuItem.Name = "большойToolStripMenuItem";
            this.большойToolStripMenuItem.ShortcutKeys = System.Windows.Forms.Keys.F3;
            this.большойToolStripMenuItem.Size = new System.Drawing.Size(160, 22);
            this.большойToolStripMenuItem.Text = "Большой";
            this.большойToolStripMenuItem.Click += new System.EventHandler(this.большойToolStripMenuItem_Click);
            //
            // скоростьToolStripMenuItem
            //
            this.скоростьToolStripMenuItem.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.медленноToolStripMenuItem,
            this.быстроToolStripMenuItem});
            this.скоростьToolStripMenuItem.Name = "скоростьToolStripMenuItem";
            this.скоростьToolStripMenuItem.Size = new System.Drawing.Size(71, 20);
            this.скоростьToolStripMenuItem.Text = "&Скорость";
            //
            // медленноToolStripMenuItem
            //
            this.медленноToolStripMenuItem.Image = global::Хачатрян_задание4.Properties.Resources.speed_slow;
            this.медленноToolStripMenuItem.Name = "медленноToolStripMenuItem";
            this.медленноToolStripMenuItem.ShortcutKeys = System.Windows.Forms.Keys.F5;
            this.медленноToolStripMenuItem.Size = new System.Drawing.Size(160, 22);
            this.медленноToolStripMenuItem.Text = "Медленно";
            this.медленноToolStripMenuItem.Click += new System.EventHandler(this.медленноToolStripMenuItem_Click);
            //
            // быстроToolStripMenuItem
            //
            this.быстроToolStripMenuItem.Image = global::Хачатрян_задание4.Properties.Resources.speed_fast;
            this.быстроToolStripMenuItem.Name = "быстроToolStripMenuItem";
            this.быстроToolStripMenuItem.ShortcutKeys = System.Windows.Forms.Keys.F6;
            this.быстроToolStripMenuItem.Size = new System.Drawing.Size(160, 22);
            this.быстроToolStripMenuItem.Text = "Быстро";
            this.быстроToolStripMenuItem.Click += new System.EventHandler(this.быстроToolStripMenuItem_Click);
            //
            // выходToolStripMenuItem
            //
            this.выходToolStripMenuItem.Image = global::Хачатрян_задание4.Properties.Resources.exit;
            this.выходToolStripMenuItem.Name = "выходToolStripMenuItem";
            this.выходToolStripMenuItem.Size = new System.Drawing.Size(70, 20);
            this.выходToolStripMenuItem.Text = "В&ыход";
            this.выходToolStripMenuItem.Click += new System.EventHandler(this.выходToolStripMenuItem_Click);
            //
            // timer1
            //
            this.timer1.Enabled = true;
            this.timer1.Tick += new System.EventHandler(this.timer1_Tick);
            //
            // imageList1
            //
            this.imageList1.ColorDepth = System.Windows.Forms.ColorDepth.Depth32Bit;
            this.imageList1.ImageSize = new System.Drawing.Size(128, 128);
            this.imageList1.TransparentColor = System.Drawing.Color.Transparent;
            //
            // contextMenuStrip1
            //
            this.contextMenuStrip1.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.роботToolStripMenuItem1,
            this.нлоToolStripMenuItem1,
            this.ракетаToolStripMenuItem1});
            this.contextMenuStrip1.Name = "contextMenuStrip1";
            this.contextMenuStrip1.Size = new System.Drawing.Size(115, 70);
            //
            // роботToolStripMenuItem1
            //
            this.роботToolStripMenuItem1.Image = global::Хачатрян_задание4.Properties.Resources.robot;
            this.роботToolStripMenuItem1.Name = "роботToolStripMenuItem1";
            this.роботToolStripMenuItem1.Size = new System.Drawing.Size(114, 22);
            this.роботToolStripMenuItem1.Text = "Робот";
            this.роботToolStripMenuItem1.Click += new System.EventHandler(this.роботToolStripMenuItem1_Click);
            //
            // нлоToolStripMenuItem1
            //
            this.нлоToolStripMenuItem1.Image = global::Хачатрян_задание4.Properties.Resources.ufo;
            this.нлоToolStripMenuItem1.Name = "нлоToolStripMenuItem1";
            this.нлоToolStripMenuItem1.Size = new System.Drawing.Size(114, 22);
            this.нлоToolStripMenuItem1.Text = "НЛО";
            this.нлоToolStripMenuItem1.Click += new System.EventHandler(this.нлоToolStripMenuItem1_Click);
            //
            // ракетаToolStripMenuItem1
            //
            this.ракетаToolStripMenuItem1.Image = global::Хачатрян_задание4.Properties.Resources.rocket;
            this.ракетаToolStripMenuItem1.Name = "ракетаToolStripMenuItem1";
            this.ракетаToolStripMenuItem1.Size = new System.Drawing.Size(114, 22);
            this.ракетаToolStripMenuItem1.Text = "Ракета";
            this.ракетаToolStripMenuItem1.Click += new System.EventHandler(this.ракетаToolStripMenuItem1_Click);
            //
            // toolStrip1
            //
            this.toolStrip1.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.налевоToolStripButton,
            this.вверхToolStripButton,
            this.направоToolStripButton,
            this.внизToolStripButton,
            this.toolStripSeparator1,
            this.toolStripLabel1,
            this.toolStripComboBox1});
            this.toolStrip1.Location = new System.Drawing.Point(0, 24);
            this.toolStrip1.Name = "toolStrip1";
            this.toolStrip1.Size = new System.Drawing.Size(684, 25);
            this.toolStrip1.TabIndex = 1;
            this.toolStrip1.Text = "toolStrip1";
            this.toolStrip1.ItemClicked += new System.Windows.Forms.ToolStripItemClickedEventHandler(this.toolStrip1_ItemClicked);
            //
            // налевоToolStripButton
            //
            this.налевоToolStripButton.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.налевоToolStripButton.Image = global::Хачатрян_задание4.Properties.Resources.arrow_left;
            this.налевоToolStripButton.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.налевоToolStripButton.Name = "налевоToolStripButton";
            this.налевоToolStripButton.Size = new System.Drawing.Size(23, 22);
            this.налевоToolStripButton.Text = "Налево";
            //
            // вверхToolStripButton
            //
            this.вверхToolStripButton.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.вверхToolStripButton.Image = global::Хачатрян_задание4.Properties.Resources.arrow_up;
            this.вверхToolStripButton.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.вверхToolStripButton.Name = "вверхToolStripButton";
            this.вверхToolStripButton.Size = new System.Drawing.Size(23, 22);
            this.вверхToolStripButton.Text = "Вверх";
            //
            // направоToolStripButton
            //
            this.направоToolStripButton.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.направоToolStripButton.Image = global::Хачатрян_задание4.Properties.Resources.arrow_right;
            this.направоToolStripButton.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.направоToolStripButton.Name = "направоToolStripButton";
            this.направоToolStripButton.Size = new System.Drawing.Size(23, 22);
            this.направоToolStripButton.Text = "Направо";
            //
            // внизToolStripButton
            //
            this.внизToolStripButton.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.внизToolStripButton.Image = global::Хачатрян_задание4.Properties.Resources.arrow_down;
            this.внизToolStripButton.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.внизToolStripButton.Name = "внизToolStripButton";
            this.внизToolStripButton.Size = new System.Drawing.Size(23, 22);
            this.внизToolStripButton.Text = "Вниз";
            //
            // toolStripSeparator1
            //
            this.toolStripSeparator1.Name = "toolStripSeparator1";
            this.toolStripSeparator1.Size = new System.Drawing.Size(6, 25);
            //
            // toolStripLabel1
            //
            this.toolStripLabel1.Name = "toolStripLabel1";
            this.toolStripLabel1.Size = new System.Drawing.Size(58, 22);
            this.toolStripLabel1.Text = "Скорость:";
            //
            // toolStripComboBox1
            //
            this.toolStripComboBox1.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.toolStripComboBox1.Items.AddRange(new object[] {
            "Медленно",
            "Быстро"});
            this.toolStripComboBox1.Name = "toolStripComboBox1";
            this.toolStripComboBox1.Size = new System.Drawing.Size(121, 25);
            this.toolStripComboBox1.SelectedIndexChanged += new System.EventHandler(this.toolStripComboBox1_SelectedIndexChanged);
            //
            // panel1
            //
            this.panel1.BackColor = System.Drawing.Color.AliceBlue;
            this.panel1.Controls.Add(this.pictureBox1);
            this.panel1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.panel1.Location = new System.Drawing.Point(0, 49);
            this.panel1.Name = "panel1";
            this.panel1.Size = new System.Drawing.Size(684, 412);
            this.panel1.TabIndex = 2;
            //
            // pictureBox1
            //
            this.pictureBox1.BackColor = System.Drawing.Color.Transparent;
            this.pictureBox1.ContextMenuStrip = this.contextMenuStrip1;
            this.pictureBox1.Image = global::Хачатрян_задание4.Properties.Resources.robot;
            this.pictureBox1.Location = new System.Drawing.Point(200, 100);
            this.pictureBox1.Name = "pictureBox1";
            this.pictureBox1.Size = new System.Drawing.Size(80, 80);
            this.pictureBox1.SizeMode = System.Windows.Forms.PictureBoxSizeMode.StretchImage;
            this.pictureBox1.TabIndex = 0;
            this.pictureBox1.TabStop = false;
            //
            // Form1
            //
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(684, 461);
            this.Controls.Add(this.panel1);
            this.Controls.Add(this.toolStrip1);
            this.Controls.Add(this.menuStrip1);
            this.MainMenuStrip = this.menuStrip1;
            this.Name = "Form1";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
            this.Text = "Практическая 4 - Управление объектом - Хачатрян Гурген";
            this.Load += new System.EventHandler(this.Form1_Load);
            this.menuStrip1.ResumeLayout(false);
            this.menuStrip1.PerformLayout();
            this.contextMenuStrip1.ResumeLayout(false);
            this.toolStrip1.ResumeLayout(false);
            this.toolStrip1.PerformLayout();
            this.panel1.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.pictureBox1)).EndInit();
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.MenuStrip menuStrip1;
        private System.Windows.Forms.ToolStripMenuItem направлениеToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem налевоToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem вверхToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem направоToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem внизToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem видToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem роботToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem нлоToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem ракетаToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem размерToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem маленькийToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem большойToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem скоростьToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem медленноToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem быстроToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem выходToolStripMenuItem;
        private System.Windows.Forms.Timer timer1;
        private System.Windows.Forms.ImageList imageList1;
        private System.Windows.Forms.ContextMenuStrip contextMenuStrip1;
        private System.Windows.Forms.ToolStripMenuItem роботToolStripMenuItem1;
        private System.Windows.Forms.ToolStripMenuItem нлоToolStripMenuItem1;
        private System.Windows.Forms.ToolStripMenuItem ракетаToolStripMenuItem1;
        private System.Windows.Forms.ToolStrip toolStrip1;
        private System.Windows.Forms.ToolStripButton налевоToolStripButton;
        private System.Windows.Forms.ToolStripButton вверхToolStripButton;
        private System.Windows.Forms.ToolStripButton направоToolStripButton;
        private System.Windows.Forms.ToolStripButton внизToolStripButton;
        private System.Windows.Forms.ToolStripSeparator toolStripSeparator1;
        private System.Windows.Forms.ToolStripLabel toolStripLabel1;
        private System.Windows.Forms.ToolStripComboBox toolStripComboBox1;
        private System.Windows.Forms.Panel panel1;
        private System.Windows.Forms.PictureBox pictureBox1;
    }
}
